export interface UserInfo {
  email: string;
}

export interface CommentResponse {
  id: string;
  comentario: string;
  fecha: Date;
  userCreated?: UserInfo;
}

export interface Comment {
  id: string;
  comentario: string;
  fecha: Date;
  userCreated?: UserInfo;
  respuestas: CommentResponse[];
}

export interface Animal {
  id: string;
  nombre: string;
  id_user: string;
  userCreated?: UserInfo;
  comentarios: Comment[];
}

export interface SpeciesInterface {
  id: string;
  nombre: string;
  animales: Animal[];
}

export interface ZoneResult {
  id: string;
  nombre: string;
  especies: SpeciesInterface[];
}

export interface AnimalWithZoneAndSpecies extends ZoneResult {}

export interface AnimalSpeciesIndicator {
  id: string;
  nombre: string;
  'total animals': number;
}

export interface ZoneIndicator {
  id: string;
  name: string;
  'total animals': number;
}

export interface AnimalCommentStats {
  id: string;
  nombre: string;
  total_comentarios: number;
  porcentaje_comentarios: number;
  comentarios: any[];
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
    respuestas: any[];
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
