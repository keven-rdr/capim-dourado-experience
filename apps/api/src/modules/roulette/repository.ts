/** Um giro gasto. A unicidade é (usuário, data, nº do giro): impede gastar o mesmo giro duas vezes. */
export interface SpinRecord {
  userId: string;
  localDate: string;
  /** 1, 2, ... dentro do dia. */
  spinNo: number;
  sliceIndex: number;
  couponId: string;
  at: string;
}

export interface RouletteRepository {
  /** Giros já gastos pelo usuário no dia. */
  countSpins(userId: string, localDate: string): Promise<number>;
  /** Devolve `false` se esse giro (usuário, data, nº) já foi gasto por outra requisição. */
  recordSpin(spin: SpinRecord): Promise<boolean>;
  /** Giros de todos os visitantes que caíram em algum dos cupons indicados. */
  countSpinsByCoupons(couponIds: readonly string[]): Promise<number>;
}
