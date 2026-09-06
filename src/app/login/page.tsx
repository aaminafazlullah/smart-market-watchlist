"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const send = (message: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(
        message,
        window.location.origin
      );
    };

    const checkRecoverySession = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") !== "reset") return;

      send({ type: "SHOW_RESET" });

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        send({
          type: "AUTH_ERROR",
          message: "This reset link is invalid or has expired. Request a new one.",
        });
      }
    };

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data || {};
      if (!data.type) return;

      if (data.type === "LOGIN" || data.type === "SIGNUP") {
        const email = typeof data.email === "string" ? data.email.trim() : "";
        const password = typeof data.password === "string" ? data.password : "";

        if (!email || !password) {
          send({
            type: "AUTH_ERROR",
            message: "Please enter your email and password.",
          });
          return;
        }

        send({ type: "AUTH_LOADING" });

        try {
          if (data.type === "SIGNUP") {
            const { data: signupData, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: `${window.location.origin}/login`,
              },
            });

            if (error) {
              send({ type: "AUTH_ERROR", message: error.message });
              send({ type: "AUTH_READY" });
              return;
            }

            if (signupData.session) {
              window.location.replace("/");
              return;
            }

            send({
              type: "AUTH_SUCCESS",
              message:
                "Account created. Check your email to verify the account, then sign in.",
            });
            send({ type: "AUTH_READY" });
            return;
          }

          const { data: loginData, error } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (error) {
            const message = error.message
              .toLowerCase()
              .includes("email not confirmed")
              ? "Your email is not verified yet. Check your inbox and confirm your account first."
              : error.message;

            send({ type: "AUTH_ERROR", message });
            send({ type: "AUTH_READY" });
            return;
          }

          if (loginData.session) {
            window.location.replace("/");
            return;
          }

          send({
            type: "AUTH_ERROR",
            message: "No active session was created. Please try again.",
          });
          send({ type: "AUTH_READY" });
        } catch (error) {
          send({
            type: "AUTH_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Authentication failed. Please try again.",
          });
          send({ type: "AUTH_READY" });
        }

        return;
      }

      if (data.type === "FORGOT_PASSWORD") {
        const email = typeof data.email === "string" ? data.email.trim() : "";

        if (!email) {
          send({
            type: "AUTH_ERROR",
            message: "Enter your email first, then try again.",
          });
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=reset`,
        });

        send({
          type: error ? "AUTH_ERROR" : "AUTH_SUCCESS",
          message: error
            ? error.message
            : "Password reset instructions have been sent to your email.",
        });
        return;
      }

      if (data.type === "UPDATE_PASSWORD") {
        const password =
          typeof data.password === "string" ? data.password : "";

        if (!password) {
          send({
            type: "AUTH_ERROR",
            message: "Enter a new password.",
          });
          return;
        }

        send({ type: "AUTH_LOADING" });

        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          send({
            type: "AUTH_ERROR",
            message: "Your reset session has expired. Request a new reset email.",
          });
          send({ type: "AUTH_READY" });
          return;
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          send({ type: "AUTH_ERROR", message: error.message });
          send({ type: "AUTH_READY" });
          return;
        }

        await supabase.auth.signOut();
        window.location.replace("/login");
      }
    };

    window.addEventListener("message", handleMessage);
    checkRecoverySession();

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0e16]">
      <iframe
        ref={iframeRef}
        title="MarketWatch AI Login"
        src="/login.html"
        className="block h-screen w-full border-0"
      />
    </main>
  );
}
