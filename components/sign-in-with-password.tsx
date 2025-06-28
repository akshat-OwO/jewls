"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";

export function SignInWithPassword({
    provider,
    handlePasswordReset,
    customSignUp: customSignUp,
    passwordRequirements,
}: {
    provider?: string;
    handlePasswordReset?: () => void;
    customSignUp?: React.ReactNode;
    passwordRequirements?: string;
}) {
    const { signIn } = useAuthActions();
    const router = useRouter();
    const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
    const [submitting, setSubmitting] = useState(false);
    return (
        <form
            className="flex flex-col"
            onSubmit={(event) => {
                event.preventDefault();
                setSubmitting(true);
                const formData = new FormData(event.currentTarget);
                signIn(provider ?? "password", formData)
                    .then(() => {
                        router.replace("/");
                    })
                    .catch((error) => {
                        console.error(error);
                        if (
                            error instanceof ConvexError &&
                            error.data === "Invalid Password"
                        ) {
                        } else {
                        }
                        setSubmitting(false);
                    });
            }}
        >
            <label htmlFor="email">Email</label>
            <Input
                name="email"
                id="email"
                className="mb-4"
                autoComplete="email"
            />
            <div className="flex items-center justify-between">
                <label htmlFor="password">Password</label>
                {handlePasswordReset && flow === "signIn" ? (
                    <Button
                        className="p-0 h-auto"
                        type="button"
                        variant="link"
                        onClick={handlePasswordReset}
                    >
                        Forgot your password?
                    </Button>
                ) : null}
            </div>
            <Input
                type="password"
                name="password"
                id="password"
                autoComplete={
                    flow === "signIn" ? "current-password" : "new-password"
                }
            />
            {flow === "signUp" && passwordRequirements !== null && (
                <span className="text-gray-500 font-thin text-sm">
                    {passwordRequirements}
                </span>
            )}
            {flow === "signUp" && customSignUp}
            <input name="flow" value={flow} type="hidden" />
            <Button type="submit" disabled={submitting} className="mt-4">
                {flow === "signIn" ? "Sign in" : "Sign up"}
            </Button>
            <Button
                variant="link"
                type="button"
                onClick={() => {
                    setFlow(flow === "signIn" ? "signUp" : "signIn");
                }}
            >
                {flow === "signIn"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
            </Button>
        </form>
    );
}
