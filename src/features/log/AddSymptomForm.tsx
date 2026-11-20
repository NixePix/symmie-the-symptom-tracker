import { useState, type FormEvent } from 'react'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { symptomNameError } from '../../domain/diary'
import type { Diary, SymptomType } from '../../domain/types'

interface Props {
  diary: Diary
  onAdd(name: string, type: SymptomType): void
}

const TYPES: { value: SymptomType; label: string }[] = [
  { value: 'strength', label: 'Strength 1–10' },
  { value: 'yesno', label: 'Yes / no' },
]

/** Name and type of a new symptom. The type is chosen here and cannot be changed afterwards. */
export function AddSymptomForm({ diary, onAdd }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<SymptomType>('strength')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const problem = symptomNameError(diary, name)
    if (problem) return setError(problem)
    onAdd(name, type)
  }

  return (
    <form onSubmit={submit}>
      <Field label="Name" value={name} error={error} onChange={(e) => setName(e.target.value)} />
      <SegmentedControl<SymptomType> label="Type" options={TYPES} value={type} onChange={setType} />
      <Button type="submit" style={{ marginTop: 16 }}>
        Save
      </Button>
    </form>
  )
}
