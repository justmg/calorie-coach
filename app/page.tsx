import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Calendar, BarChart3, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Calorie Coach</h1>
          <nav className="flex gap-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold mb-6">
          Track Calories with a Simple Phone Call
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Voice-first nutrition logging for busy professionals and non-tech-savvy users.
          Just tell us what you ate, and we'll handle the rest.
        </p>
        <Link href="/signup">
          <Button size="lg" className="text-lg px-8 py-6">
            Start Your Free Trial
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Phone className="w-12 h-12 text-blue-600 mb-4" />
              <CardTitle>Daily Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Receive a scheduled call at your preferred time every day
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-12 h-12 text-blue-600 mb-4" />
              <CardTitle>PIN Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure access with your personal PIN ensures privacy
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="w-12 h-12 text-blue-600 mb-4" />
              <CardTitle>Natural Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Simply speak what you ate - our AI understands natural language
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-blue-600 mb-4" />
              <CardTitle>Real-Time Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View your calorie intake, trends, and progress instantly
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-6">
            Start Tracking Your Calories Today
          </h3>
          <p className="text-xl mb-8 opacity-90">
            No apps to download. No complex interfaces. Just a simple phone call.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary">
              Sign Up Now - It's Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}