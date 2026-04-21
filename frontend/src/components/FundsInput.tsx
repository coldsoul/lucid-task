interface Props {
  value: number
  onChange: (value: number) => void
}

export function FundsInput({ value, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = e.target.value === '' ? 0 : parseFloat(e.target.value)
    onChange(isNaN(numValue) ? 0 : numValue)
  }

  return (
    <div>
      <label>Available Funds ($)</label>
      <input
        type="number"
        min={1}
        step="0.01"
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}
