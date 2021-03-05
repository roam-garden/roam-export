export const truthy = <TValue>(value: TValue | null | undefined): value is TValue => Boolean(value)
