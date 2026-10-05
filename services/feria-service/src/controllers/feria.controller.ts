import { Request, Response } from 'express';
import { buscarItemsDto } from '../dtos/feria.dto';
import { catalogoService } from '../services/catalogo.service';
import { confirmacionService } from '../services/confirmacion.service';
import { aEventoPublico, eventoService } from '../services/evento.service';
import { AppError } from '../utils/errors';

export const feriaController = {
  async evento(_req: Request, res: Response) {
    res.json({ evento: aEventoPublico(await eventoService.obtenerActivo()) });
  },

  async items(req: Request, res: Response) {
    const filtros = buscarItemsDto.safeParse(req.query);
    if (!filtros.success) {
      throw new AppError(400, 'DATOS_INVALIDOS', 'Los filtros de búsqueda no son válidos');
    }
    res.json({ items: await catalogoService.listar(filtros.data) });
  },

  async miConfirmacion(req: Request, res: Response) {
    res.json({ confirmacion: await confirmacionService.obtenerMia(Number(req.usuario!.sub)) });
  },

  async confirmar(req: Request, res: Response) {
    const confirmacion = await confirmacionService.confirmar(Number(req.usuario!.sub), req.body);
    res.status(201).json({ confirmacion });
  },
};
