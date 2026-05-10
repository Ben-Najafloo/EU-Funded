import { SignIn } from '@clerk/clerk-react'

const SignInPage = () => {
    return (
        <div className="flex justify-center items-center min-h-screen bg-white dark:bg-black pt-16">
            <SignIn />
        </div>
    )
}

export default SignInPage