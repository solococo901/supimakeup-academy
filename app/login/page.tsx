"use client";
import React, { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Thực hiện đăng nhập Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Kiểm tra quyền (Role) trong Firestore để điều hướng đúng trang
      if (user.email) {
        const userRef = doc(db, "users", user.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().role === "admin") {
          router.push('/admin'); // Admin vào trang quản lý
        } else {
          router.push('/wheel'); // Khách vào trang vòng quay
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Sai tài khoản hoặc mật khẩu rồi bạn ơi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff5f6] p-4 font-sans">
      {/* Khối đăng nhập chính */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-[#ffe4e1]">
        
        {/* Phần đầu màu hồng đậm */}
        <div className="bg-[#ff85a1] py-10 text-center px-6">
          <div className="text-5xl mb-4 animate-bounce">🎁</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">
            Vòng quay may mắn
          </h2>
          <p className="text-[#ffe4e1] font-inter text-xs mt-2  tracking-tighter">
            Vòng quay dành riêng cho học viên
          </p>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-500 px-4 py-3 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-black text-[#8b3d48] uppercase ml-1">
              Email học viên
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email"
              className="w-full bg-[#fff5f6] border-2 border-[#ffe4e1] p-4 rounded-2xl text-[#8b3d48] outline-none focus:border-[#ff85a1] transition-all placeholder:text-[#ffb6c1]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-[#8b3d48] uppercase ml-1">
              Mật khẩu
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#fff5f6] border-2 border-[#ffe4e1] p-4 rounded-2xl text-[#8b3d48] outline-none focus:border-[#ff85a1] transition-all placeholder:text-[#ffb6c1]"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#ffb6c1] to-[#ff85a1] text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Vào Quay Thưởng"}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-[#fff5f6] py-4 text-center border-t border-[#ffe4e1]">
          <span className="text-[10px] font-bold text-[#ffb6c1] uppercase tracking-[0.4em]">
            Supi - Sanverse - Makeup and Academy
          </span>
        </div>
      </div>
    </div>
  );
}