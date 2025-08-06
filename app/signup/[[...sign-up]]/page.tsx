import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-lg",
          }
        }}
        path="/signup"
        routing="path"
        signInUrl="/login"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
    </div>
  )
}