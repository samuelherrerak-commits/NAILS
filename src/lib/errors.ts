export type ApiErrorCode =
  | 'no_autorizado'
  | 'cupo_ocupado'
  | 'cupon_invalido'
  | 'datos_invalidos'
  | 'red'
  | 'desconocido'

export class ApiError extends Error {
  code: ApiErrorCode
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
  }
}
