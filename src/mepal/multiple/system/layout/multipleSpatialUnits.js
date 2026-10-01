// Three.js and MULTIPLE_SYSTEM positions use metres; commercial dimensions use cm/mm.
export const toWorldUnitsFromMm = (millimetres) => Number(millimetres) / 1000;
export const toWorldUnitsFromCm = (centimetres) => toWorldUnitsFromMm(Number(centimetres) * 10);
export const toMmFromWorldUnits = (metres) => Number(metres) * 1000;
