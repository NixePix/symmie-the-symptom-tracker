import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from './SegmentedControl'

const options = [
  { value: 'strength', label: 'Strength 1–10' },
  { value: 'yesno', label: 'Yes / no' },
]

function Harness({ onChange = () => {} }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('strength')
  return (
    <SegmentedControl
      label="Type"
      options={options}
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    />
  )
}

describe('SegmentedControl', () => {
  it('is a labelled radio group with one radio per option; the current value is checked', () => {
    render(<Harness />)
    expect(screen.getByRole('radiogroup', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Strength 1–10' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Yes / no' })).not.toBeChecked()
  })

  it('reports the tapped option and moves the checked state to it', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Yes / no' }))
    expect(onChange).toHaveBeenCalledWith('yesno')
    expect(screen.getByRole('radio', { name: 'Yes / no' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Strength 1–10' })).not.toBeChecked()
  })
})
