import { Item } from '@prisma/client';
import { BuscarItemsDto } from '../dtos/feria.dto';
import { itemModel } from '../models/item.model';

export interface ItemPublico {
  id: number;
  tipo: 'SERVICIO' | 'PRODUCTO';
  nombre: string;
  descripcion: string | null;
  precio: number;
}

export function aItemPublico(item: Item): ItemPublico {
  return {
    id: item.id,
    tipo: item.tipo,
    nombre: item.nombre,
    descripcion: item.descripcion,
    precio: item.precio.toNumber(),
  };
}

export const catalogoService = {
  async listar(filtros: BuscarItemsDto): Promise<ItemPublico[]> {
    const items = await itemModel.listarActivos(filtros);
    return items.map(aItemPublico);
  },
};
