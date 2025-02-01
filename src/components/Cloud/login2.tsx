import { useEffect } from 'react';
import { Github, Mail, Apple } from 'lucide-react';
import { useSearchParams } from "react-router-dom";

import { LoginForm } from '@/components/Cloud/LoginForm';
import { SocialButton } from '@/components/Cloud/SocialButton';
import { Divider } from '@/components/Cloud/Divider';
import { authWitheGithub } from '@/utils/index';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const code = searchParams.get("code");

  useEffect(()=>{
    
  }, [code])

  function GithubClick() {
    uid && authWitheGithub(uid)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue to Coco</p>
        </div>

        <div className="space-y-4 mb-6">
          <SocialButton 
            icon={<Github className="w-5 h-5" />}
            provider="GitHub"
            onClick={() => GithubClick()}
          />
          <SocialButton 
            icon={<Mail className="w-5 h-5" />}
            provider="Google"
            onClick={() => console.log('Google login')}
          />
          <SocialButton 
            icon={<Apple className="w-5 h-5" />}
            provider="Apple"
            onClick={() => console.log('Apple login')}
          />
        </div>

        <Divider />

        <LoginForm onSubmit={(email, password) => console.log(email, password)} />
      </div>
    </div>
  );
}