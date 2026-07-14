export interface LabeledOption {
  readonly value: string;
  readonly label: string;
}

export function selectedOptionLabel(
  options: readonly LabeledOption[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
