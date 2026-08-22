import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'NutriLife — Hidup lebih sehat, setiap hari', description: 'Platform kesehatan personal untuk membantu kamu makan lebih baik, bergerak lebih aktif, dan hidup lebih seimbang.' }
export const viewport: Viewport = { colorScheme: 'light dark', themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f6f8f6' }, { media: '(prefers-color-scheme: dark)', color: '#17221e' }] }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="id" className="bg-background">
			<body className="antialiased">
				{children}
				{process.env.NODE_ENV === 'production' && <Analytics />}
			</body>
		</html>
	)
}
