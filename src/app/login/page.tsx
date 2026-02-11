import { AuthForm } from "@/components/auth/AuthForm";
import { Section } from "@/components/ui/Section";

export default function LoginPage() {
    return (
        <Section className="min-h-[80vh] flex items-center justify-center">
            <AuthForm />
        </Section>
    );
}
