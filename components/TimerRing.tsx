import { FONT_BODY } from '@/lib/typography'

type Props = {
  seconds: number
  total?: number
  size?: number
  strokeWidth?: number
}

export function TimerRing({
  seconds,
  total = 60,
  size = 56,
  strokeWidth = 3,
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = Math.max(0, Math.min(1, seconds / total))
  const isUrgent = seconds <= 10
  const color = isUrgent ? 'var(--red)' : 'var(--brown-dark)'

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--linen)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          fontFamily: FONT_BODY,
          fontSize: '14px',
          fontWeight: 500,
          color,
        }}
      >
        {seconds}
      </span>
    </div>
  )
}
