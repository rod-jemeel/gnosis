import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up - Gnosis',
  description: 'Create your account',
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
