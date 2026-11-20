export interface ZoneIndicator {
  id?: string;
  name: string;
  'total animals': number;
}

export interface SpeciesIndicator {
  id: string;
  nombre: string;
  'total animals': number;
}

export interface AnimalCommentStats {
  id: string;
  nombre: string;
  total_comentarios: number;
  porcentaje_comentarios: number;
  comentarios: unknown[];
}

export interface CommentStatsResponse {
  animales: AnimalCommentStats[];
  total_comentarios: number;
  total_animales_con_comentarios: number;
  total_animales_sin_comentarios: number;
}

export interface CommentCategoryStats {
  categoria: string;
  cantidad: number;
  porcentaje: number;
  comentarios: Array<{
    id: string;
    comentario: string;
    animal: string;
    totalRespuestas: number;
    respuestas: unknown[];
  }>;
}

export interface CommentAnalysisResponse {
  estadisticas: CommentCategoryStats[];
  resumen: {
    total_comentarios_principales: number;
    comentarios_con_respuestas: number;
    comentarios_sin_respuestas: number;
    porcentaje_con_respuestas: number;
    porcentaje_sin_respuestas: number;
  };
}

export interface SearchResponse {
  termino_busqueda: string;
  data: {
    total_resultado: number;
    resultado: {
      zona: unknown[];
      especie: unknown[];
      animal: unknown[];
      comentario: unknown[];
      respuesta: unknown[];
    };
  };
}

export interface AnimalRegisteredToday {
  nombre: string;
  id_usuario: string;
  fecha: Date;
  especies: {
    id: string;
    nombre: string;
    area: { id: string; nombre: string } | null;
  } | null;
}
