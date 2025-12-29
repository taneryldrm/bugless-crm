import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        navigate('/');
    } catch (err) {
        console.error("Auth error:", err);
        alert(err.message || 'Bir hata oluştu.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-900/20 rounded-full blur-[128px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[96px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Left Side - Visual / Brand */}
      <div className="hidden lg:flex w-1/2 relative z-10 items-center justify-center p-12">
          <div className="w-full max-w-lg space-y-8">
              {/* Logo Presentation */}
              <div className="flex flex-col gap-6">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                    {/* SVG Clone of the Logo Icon */}
                    <svg viewBox="0 0 100 100" className="w-20 h-20 fill-black" xmlns="http://www.w3.org/2000/svg">
                        <g transform="rotate(-30 50 50)">
                            <rect x="10" y="5" width="22" height="90" rx="11" />
                            <rect x="68" y="5" width="22" height="90" rx="11" />
                            <circle cx="50" cy="30" r="15" />
                            <circle cx="50" cy="70" r="15" />
                        </g>
                    </svg>
                </div>
                <h1 className="text-7xl font-sans font-black text-white tracking-tighter leading-none">
                  BUGLESS<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">DIGITAL</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
                  Güçlü CRM altyapısı ile iş süreçlerinizi kusursuz yönetin.
                </p>
              </div>

              {/* Decorative Pill */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/50 text-sm backdrop-blur-md">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 Sistem Durumu: Aktif ve Güvenli
              </div>
          </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10 bg-black/40 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none transition-all">
          <div className="w-full max-w-md space-y-8">
              
              {/* Mobile Logo Show */}
              <div className="lg:hidden flex flex-col items-center mb-8">
                 <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg mb-4">
                    <svg viewBox="0 0 100 100" className="w-12 h-12 fill-black" xmlns="http://www.w3.org/2000/svg">
                        <g transform="rotate(-30 50 50)">
                            <rect x="10" y="5" width="22" height="90" rx="11" />
                            <rect x="68" y="5" width="22" height="90" rx="11" />
                            <circle cx="50" cy="30" r="15" />
                            <circle cx="50" cy="70" r="15" />
                        </g>
                    </svg>
                 </div>
                 <h2 className="text-3xl font-black text-white tracking-tighter">BUGLESS DIGITAL</h2>
              </div>

              <div className="space-y-2 text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-white tracking-tight">Giriş Yap</h2>
                  <p className="text-gray-500">Hesabınıza erişmek için bilgilerinizi giriniz.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-400 pl-1">E-posta</label>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-white transition-colors">
                              <Mail className="w-5 h-5" />
                          </div>
                          <input 
                            type="email" 
                            className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                            placeholder="ornek@bugless.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                      </div>
                  </div>

                  <div className="space-y-1.5">
                      <div className="flex items-center justify-between pl-1">
                          <label className="text-sm font-medium text-gray-400">Şifre</label>
                      </div>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-white transition-colors">
                              <Lock className="w-5 h-5" />
                          </div>
                          <input 
                            type={showPassword ? 'text' : 'password'}
                            className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button 
                             type="button"
                             onClick={() => setShowPassword(!showPassword)}
                             className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
                          >
                             {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                      </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 bg-white text-black hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-base shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] rounded-xl"
                  >
                    {loading ? (
                       <span className="flex items-center gap-2 text-black">
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Giriş Yapılıyor...
                       </span>
                    ) : (
                       <span className="flex items-center gap-2 text-black">
                          Giriş Yap <ArrowRight className="w-5 h-5 text-black" />
                       </span>
                    )}
                  </Button>
              </form>

               <div className="pt-6 text-center text-sm text-gray-600">
                  <p className="mt-4">&copy; 2025 Bugless Digital. Tüm hakları saklıdır.</p>
               </div>
          </div>
      </div>
    </div>
  );
}

