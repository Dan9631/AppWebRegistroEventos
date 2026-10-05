import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { LoginDto, RegistroDto } from '../dtos/auth.dto';
import { tokenVerificacionModel } from '../models/token-verificacion.model';
import { UsuarioConTipo, usuarioModel } from '../models/usuario.model';
import { generarToken, hashToken } from '../utils/crypto';
import { AppError } from '../utils/errors';
import { emailService } from './email.service';
import { tokenService } from './token.service';

const BCRYPT_ROUNDS = 12;

// El registro público solo crea clientes. El tipo nunca se toma del cuerpo de la petición.
const TIPO_REGISTRO_PUBLICO = 'CLIENTE';

// Hash de referencia para comparar cuando el email no existe, y así
// responder en el mismo tiempo que cuando sí existe (evita enumerar cuentas).
const HASH_FICTICIO = bcrypt.hashSync('contraseña-ficticia', BCRYPT_ROUNDS);

export interface UsuarioPublico {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  tipo: string;
  emailVerificado: boolean;
}

export interface Sesion {
  accessToken: string;
  refreshToken: string;
  refreshExpiraEn: Date;
  usuario: UsuarioPublico;
}

function aPublico(usuario: UsuarioConTipo): UsuarioPublico {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    email: usuario.email,
    tipo: usuario.tipoUsuario.codigo,
    emailVerificado: usuario.emailVerificadoEn !== null,
  };
}

async function enviarNuevoTokenVerificacion(usuario: UsuarioConTipo): Promise<void> {
  await tokenVerificacionModel.invalidarPendientes(usuario.id);

  const token = generarToken();
  const expiraEn = new Date(Date.now() + env.VERIFICACION_TTL_HORAS * 60 * 60 * 1000);
  await tokenVerificacionModel.crear(usuario.id, hashToken(token), expiraEn);

  await emailService.enviarVerificacion(usuario, token);
}

async function crearSesion(usuario: UsuarioConTipo): Promise<Sesion> {
  const accessToken = tokenService.firmarAccessToken({
    sub: String(usuario.id),
    tipo: usuario.tipoUsuario.codigo,
    email: usuario.email,
  });
  const refresh = await tokenService.emitirRefreshToken(usuario.id);

  return {
    accessToken,
    refreshToken: refresh.token,
    refreshExpiraEn: refresh.expiraEn,
    usuario: aPublico(usuario),
  };
}

export const authService = {
  async registrar(datos: RegistroDto): Promise<UsuarioPublico> {
    const existente = await usuarioModel.buscarPorEmail(datos.email);
    if (existente) {
      throw new AppError(409, 'EMAIL_REGISTRADO', 'Ya existe una cuenta con este email');
    }

    let usuario: UsuarioConTipo;
    try {
      usuario = await usuarioModel.crear({
        nombre: datos.nombre,
        apellidos: datos.apellidos,
        email: datos.email,
        passwordHash: await bcrypt.hash(datos.password, BCRYPT_ROUNDS),
        codigoTipo: TIPO_REGISTRO_PUBLICO,
      });
    } catch (error) {
      // Dos registros simultáneos con el mismo email: el índice único decide.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'EMAIL_REGISTRADO', 'Ya existe una cuenta con este email');
      }
      throw error;
    }

    await enviarNuevoTokenVerificacion(usuario);
    return aPublico(usuario);
  },

  async verificarEmail(token: string): Promise<void> {
    const registro = await tokenVerificacionModel.buscarPorHash(hashToken(token));

    if (!registro || registro.usadoEn) {
      throw new AppError(400, 'TOKEN_VERIFICACION_INVALIDO', 'El enlace de verificación no es válido o ya fue utilizado');
    }
    if (registro.expiraEn < new Date()) {
      throw new AppError(400, 'TOKEN_VERIFICACION_EXPIRADO', 'El enlace de verificación expiró, solicite uno nuevo');
    }

    const consumido = await tokenVerificacionModel.consumir(registro.id, registro.usuarioId);
    if (!consumido) {
      throw new AppError(400, 'TOKEN_VERIFICACION_INVALIDO', 'El enlace de verificación no es válido o ya fue utilizado');
    }
  },

  /** Siempre termina sin error para no revelar si el email está registrado. */
  async reenviarVerificacion(email: string): Promise<void> {
    const usuario = await usuarioModel.buscarPorEmail(email);
    if (usuario && usuario.activo && !usuario.emailVerificadoEn) {
      await enviarNuevoTokenVerificacion(usuario);
    }
  },

  async login(datos: LoginDto): Promise<Sesion> {
    const usuario = await usuarioModel.buscarPorEmail(datos.email);
    const passwordValida = await bcrypt.compare(datos.password, usuario?.passwordHash ?? HASH_FICTICIO);

    if (!usuario || !passwordValida) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos');
    }
    if (!usuario.activo) {
      throw new AppError(403, 'USUARIO_INACTIVO', 'La cuenta está deshabilitada');
    }
    if (!usuario.emailVerificadoEn) {
      throw new AppError(403, 'EMAIL_NO_VERIFICADO', 'Debe confirmar su correo antes de iniciar sesión');
    }

    return crearSesion(usuario);
  },

  async refrescar(refreshToken: string): Promise<Sesion> {
    const rotado = await tokenService.rotarRefreshToken(refreshToken);
    const usuario = await usuarioModel.buscarPorId(rotado.usuarioId);

    if (!usuario || !usuario.activo) {
      await tokenService.revocarRefreshToken(rotado.token);
      throw new AppError(401, 'SESION_INVALIDA', 'Sesión inválida');
    }

    return {
      accessToken: tokenService.firmarAccessToken({
        sub: String(usuario.id),
        tipo: usuario.tipoUsuario.codigo,
        email: usuario.email,
      }),
      refreshToken: rotado.token,
      refreshExpiraEn: rotado.expiraEn,
      usuario: aPublico(usuario),
    };
  },

  logout(refreshToken: string): Promise<void> {
    return tokenService.revocarRefreshToken(refreshToken);
  },

  async obtenerPerfil(usuarioId: number): Promise<UsuarioPublico> {
    const usuario = await usuarioModel.buscarPorId(usuarioId);
    if (!usuario || !usuario.activo) {
      throw new AppError(404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado');
    }
    return aPublico(usuario);
  },
};
