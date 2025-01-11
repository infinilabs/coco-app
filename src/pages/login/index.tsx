import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useSearchParams } from "react-router-dom";

import { authWitheGithub } from "@/utils/index";
import loginImg from "@/assets/images/bg-login.png";
import logoImg from "@/assets/images/coco-logo.png";
import AppleImg from "@/assets/images/apple.png";
import GithubImg from "@/assets/images/github.png";
import GoogleImg from "@/assets/images/google.png";
import { useAppStore } from "@/stores/appStore";

export default function LoginPage() {
  const initializeListeners = useAppStore((state) => state.initializeListeners);
  useEffect(() => {
    initializeListeners();
  }, []);

  const handleGoogleSignIn = (response: any) => {
    console.log("Google Login Success:", response);
    // response.credential
  };

  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const code = searchParams.get("code");

  useEffect(() => {}, [code]);

  function handleGithubSignIn() {
    uid && authWitheGithub(uid);
  }

  const clientId = "YOUR_APPLE_CLIENT_ID";
  const redirectUri = "http://localhost:3000";
  const scope = "name email";

  const handleAppleSignIn = () => {
    const authUrl = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <a href="coco://oauth_callback?code=ctvracbq50ke7o4qksj0&provider=coco-cloud">
        In order to continue, please click here to launch Coco AI
      </a>

      <div className="min-h-screen container py-[30px] relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute top-[60px] inset-0 z-0">
          <img
            src={loginImg}
            alt="Background"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-[100%] px-[130px]">
          {/* Logo */}
          <div className="flex items-center mb-[60px]">
            <img src={logoImg} alt="Coco" className="h-10 w-[127px]" />
          </div>

          {/* Main Text */}
          <div className="text-left mb-[60px]">
            <h1 className="text-[64px] leading-[72px] font-bold text-white mb-4">
              INSERT
              <br />
              THE
              <br />
              STRAW
            </h1>
            <h2 className="text-[64px] leading-[72px] font-bold text-cyan-400 mb-6">
              LET'S BEGIN!
            </h2>
            <p className="text-white">
              With Coco AI, accessing your data is as easy as sipping fresh
              coconut juice.
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="font-bold text-[20px] text-white leading-[30px] text-left uppercase mb-5">
            Sign in With
          </div>
          <div className="flex gap-8">
            <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
              <button
                className="w-[60px] h-[60px] bg-white hover:bg-gray-100 text-black rounded-full py-3 px-4 flex items-center justify-center space-x-2 transition-colors"
                onClick={handleGoogleSignIn}
              >
                <img
                  src={GoogleImg}
                  alt="Continue with Google"
                  className="w-[29px] h-[29px]"
                />
              </button>
            </GoogleOAuthProvider>

            <button
              className="w-[60px] h-[60px] bg-white hover:bg-gray-100 text-black rounded-full py-3 px-4 flex items-center justify-center space-x-2 transition-colors"
              onClick={handleGithubSignIn}
            >
              <img
                src={AppleImg}
                alt="Continue with Apple"
                className="w-[26px] h-[30px]"
              />
            </button>

            <button
              className="w-[60px] h-[60px] bg-white hover:bg-gray-100 text-black rounded-full py-3 px-4 flex items-center justify-center space-x-2 transition-colors"
              onClick={handleAppleSignIn}
            >
              <img
                src={GithubImg}
                alt="Continue with GitHub"
                className="w-[30px] h-[29px]"
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 w-full text-sm text-gray-500 flex justify-center">
          © {new Date().getFullYear()} Coco Labs. All rights reserved.
        </div>
      </div>
    </div>
  );
}
