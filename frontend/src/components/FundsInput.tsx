import { useState, useEffect } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
}

export function FundsInput({ value, onChange }: Props) {
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputValue(raw)
    const numValue = raw === '' ? 0 : parseFloat(raw)
    onChange(isNaN(numValue) ? 0 : numValue)
  }

  return (
    <div className="field-group">
      <label className="field-label">Available Funds ($)</label>
      <input
        className="field-input"
        type="number"
        min={1}
        step="0.01"
        value={inputValue}
        onChange={handleChange}
      />
    </div>
  )
}
