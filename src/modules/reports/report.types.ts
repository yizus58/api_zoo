export interface ReportReply {
  id: string;
  comentario: string;
  autor: string;
  fecha: Date;
}

/** One commented animal row of the report. */
export interface ReportEntry {
  zona: string;
  specie: string;
  animal: string;
  comentario: {
    id: string;
    comentario: string;
    autor: string;
    fecha: Date;
    respuesta?: ReportReply;
  };
}

/** The report of one employee: comments made today on the animals they are responsible for. */
export interface UserReport {
  user: string;
  email: string;
  data: ReportEntry[];
}
