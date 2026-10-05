import { describe, expect, it } from 'vitest';
import { aplicarPorcentaje, calcularDescuentos, ItemSeleccionado } from './descuentos';

const servicio = (precio: number): ItemSeleccionado => ({ tipo: 'SERVICIO', precio });
const producto = (precio: number): ItemSeleccionado => ({ tipo: 'PRODUCTO', precio });

describe('descuento en servicios', () => {
  it('no hay descuento sin servicios', () => {
    expect(calcularDescuentos([]).servicios.porcentaje).toBe(0);
  });

  it('un solo servicio no tiene descuento aunque supere Q.1,500', () => {
    expect(calcularDescuentos([servicio(2000)]).servicios.porcentaje).toBe(0);
  });

  it('2 servicios que suman menos de Q.1,500 → 3%', () => {
    expect(calcularDescuentos([servicio(100), servicio(50.3)]).servicios.porcentaje).toBe(3);
  });

  it('2 servicios que suman exactamente Q.1,500 → 3% (la regla dice "mayor a")', () => {
    expect(calcularDescuentos([servicio(750), servicio(750)]).servicios.porcentaje).toBe(3);
  });

  it('2 servicios que suman Q.1,500.01 → 5%', () => {
    expect(calcularDescuentos([servicio(750), servicio(750.01)]).servicios.porcentaje).toBe(5);
  });

  it('suma con decimales en el límite no se ve afectada por punto flotante', () => {
    // 0.1 + 0.2 en punto flotante es 0.30000000000000004
    const items = [servicio(1499.9), servicio(0.1)];
    expect(calcularDescuentos(items).servicios.subtotal).toBe(1500);
    expect(calcularDescuentos(items).servicios.porcentaje).toBe(3);
  });

  it('los productos no cuentan para el descuento de servicios', () => {
    const resultado = calcularDescuentos([servicio(1600), producto(100), producto(100)]);
    expect(resultado.servicios.porcentaje).toBe(0);
  });
});

describe('descuento en productos', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 3],
    [4, 3],
    [5, 5],
    [8, 5],
  ])('%i productos → %i%%', (cantidad, esperado) => {
    const items = Array.from({ length: cantidad }, () => producto(10));
    expect(calcularDescuentos(items).productos.porcentaje).toBe(esperado);
  });

  it('los servicios no cuentan para el descuento de productos', () => {
    const resultado = calcularDescuentos([servicio(10), servicio(10), producto(10), producto(10)]);
    expect(resultado.productos.porcentaje).toBe(0);
  });
});

describe('montos', () => {
  it('calcula subtotal, descuento y total redondeados a centavos', () => {
    // Ejemplo del diseño: Servicio 1 Q.100.00 + Servicio 2 Q.50.30
    const resultado = calcularDescuentos([servicio(100), servicio(50.3)]);
    expect(resultado.servicios).toEqual({
      cantidad: 2,
      subtotal: 150.3,
      porcentaje: 3,
      descuento: 4.51, // 4.509 redondeado
      total: 145.79,
    });
  });

  it('suma los totales de servicios y productos', () => {
    const resultado = calcularDescuentos([
      servicio(100),
      servicio(50.3),
      producto(49.99),
      producto(80.5),
      producto(350),
      producto(500),
      producto(150),
    ]);
    expect(resultado.productos.porcentaje).toBe(5);
    expect(resultado.productos.subtotal).toBe(1130.49);
    expect(resultado.productos.descuento).toBe(56.52);
    expect(resultado.productos.total).toBe(1073.97);
    expect(resultado.total).toBe(1219.76); // 145.79 + 1073.97
  });
});

describe('aplicarPorcentaje', () => {
  it('respeta el porcentaje guardado aunque las reglas den otro resultado', () => {
    // Un solo servicio no tendría descuento hoy, pero se le otorgó 5% al confirmar
    expect(aplicarPorcentaje([2000], 5)).toEqual({
      cantidad: 1,
      subtotal: 2000,
      porcentaje: 5,
      descuento: 100,
      total: 1900,
    });
  });
});
