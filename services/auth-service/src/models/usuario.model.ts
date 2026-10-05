import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const conTipo = { tipoUsuario: true } satisfies Prisma.UsuarioInclude;

export type UsuarioConTipo = Prisma.UsuarioGetPayload<{ include: typeof conTipo }>;

export const usuarioModel = {
  buscarPorEmail(email: string): Promise<UsuarioConTipo | null> {
    return prisma.usuario.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: conTipo,
    });
  },

  buscarPorId(id: number): Promise<UsuarioConTipo | null> {
    return prisma.usuario.findUnique({ where: { id }, include: conTipo });
  },

  crear(datos: {
    nombre: string;
    apellidos: string;
    email: string;
    passwordHash: string;
    codigoTipo: string;
  }): Promise<UsuarioConTipo> {
    return prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        apellidos: datos.apellidos,
        email: datos.email,
        passwordHash: datos.passwordHash,
        tipoUsuario: { connect: { codigo: datos.codigoTipo } },
      },
      include: conTipo,
    });
  },
};
