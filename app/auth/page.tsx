import { SignInWithPassword } from "@/components/sign-in-with-password";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem } from "lucide-react";

export default function SignInFormPassword() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                            <Gem className="h-7 w-7 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome to Jewls</CardTitle>
                    <CardDescription>
                        Sign in or create an account to start your AI jewelry try-on experience
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SignInWithPassword />
                </CardContent>
            </Card>
        </div>
    );
}
