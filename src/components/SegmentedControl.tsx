import styles from './SegmentedControl.module.css'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{label}</span>
      <div className={styles.control} role="group" aria-label={label}>
        {options.map((option) => (
          <button
            className={option.value === value ? styles.active : styles.button}
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
