import { Gemstone, RecuttingRecord } from "../types";

export function normalizeGemstone(raw: any): Gemstone {
  return {
    ...raw,

    weight: Number(raw.weight) || 0,

    costPrice: Number(raw.costPrice) || 0,

    sellingPrice: Number(raw.sellingPrice) || 0,

    specificGravity: Number(raw.specificGravity) || 0,

    dimensions: {
      length: Number(raw.dimensions?.length) || 0,
      width: Number(raw.dimensions?.width) || 0,
      depth: Number(raw.dimensions?.depth) || 0,
    },

    recuttings: (raw.recuttings || []).map(
      (r: any): RecuttingRecord => ({
        ...r,

        initialWeight: Number(r.initialWeight) || 0,
        finalWeight: Number(r.finalWeight) || 0,

        lossWeight: Number(r.lossWeight) || 0,

        lossPercentage: Number(r.lossPercentage) || 0,

        laborCost: Number(r.laborCost) || 0,

        initialDimensions: {
          length: Number(r.initialDimensions?.length) || 0,
          width: Number(r.initialDimensions?.width) || 0,
          depth: Number(r.initialDimensions?.depth) || 0,
        },

        finalDimensions: {
          length: Number(r.finalDimensions?.length) || 0,
          width: Number(r.finalDimensions?.width) || 0,
          depth: Number(r.finalDimensions?.depth) || 0,
        },
      })
    ),
  };
}