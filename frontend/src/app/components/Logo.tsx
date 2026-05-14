import logoImg from '../../assets/logo.png'

export default function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return <img src={logoImg} alt="CourseNest" className={className} style={{ objectFit: 'contain' }} />
}