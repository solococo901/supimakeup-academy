"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  increment,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import LuckyWheel from "../components/LuckyWheel";

// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACE) ĐỂ CHIỀU LÒNG TYPESCRIPT
interface HistoryItem {
  prize: string;
  date: string;
}

interface UserData {
  spins_left: number;
  next_prize_index: number;
  role: string;
  history?: HistoryItem[];
}

export default function WheelPage() {
  // const [showHistory, setShowHistory] = useState(false);
  // THÊM STATE NÀY ĐỂ HIỆN POPUP CHÚC MỪNG:
  const [wonPrize, setWonPrize] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  // 2. THAY `any` BẰNG `UserData`
  const [userData, setUserData] = useState<UserData | null>(null);
  const [prizes, setPrizes] = useState<string[]>([]);
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    const userRef = doc(db, "users", userEmail);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        // Ép kiểu dữ liệu Firebase về dạng UserData
        setUserData(docSnap.data() as UserData);
      }
    });
    return () => unsubscribeUser();
  }, [userEmail]);

  // 3. Lắng nghe danh sách phần thưởng REAL-TIME
  useEffect(() => {
    const wheelRef = doc(db, "settings", "wheel");

    // Dùng onSnapshot thay vì getDoc để tự cập nhật khi Admin đổi quà
    const unsubscribeWheel = onSnapshot(
      wheelRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          console.log("Dữ liệu vòng quay mới:", data.prizes);
          setPrizes(data.prizes || []);
        }
      },
      (error) => {
        console.error("Lỗi lắng nghe vòng quay:", error);
      },
    );

    return () => unsubscribeWheel();
  }, []);

  // Logic xác định ô trúng thưởng
  useEffect(() => {
    if (userData && prizes.length > 0) {
      // Ép kiểu chắc chắn giá trị này thành một số nguyên (number)
      const nextIndex = Number(userData.next_prize_index);

      // Kiểm tra xem số này có hợp lệ và khác -1 hay không
      if (!isNaN(nextIndex) && nextIndex !== -1) {
        setTargetIndex(nextIndex); // Truyền biến thuần number vào đây, hết báo đỏ!
      } else {
        setTargetIndex(Math.floor(Math.random() * prizes.length));
      }
    }
  }, [userData, prizes]);

  const handleSpinFinished = async (prizeName: string) => {
    // alert(`🎉 Chúc mừng bạn đã trúng: ${prizeName} 🎉`);
    setWonPrize(prizeName);

    if (userEmail && userData) {
      try {
        const userRef = doc(db, "users", userEmail);

        // 3. SỬ DỤNG Record THAY VÌ `any` CHO ĐỐI TƯỢNG CẬP NHẬT
        const updateData: Record<string, unknown> = {
          history: arrayUnion({
            prize: prizeName,
            date: new Date().toISOString(),
          }),
        };

        if (
          userData.next_prize_index !== undefined &&
          userData.next_prize_index !== -1
        ) {
          updateData.next_prize_index = -1;
        }

        if (userData.spins_left && userData.spins_left > 0) {
          updateData.spins_left = increment(-1);
        }

        // Bỏ qua cảnh báo kiểu dữ liệu động của Firebase nếu có
        await updateDoc(userRef, updateData as never);
      } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        alert(
          "Lỗi lưu kết quả, vui lòng kiểm tra kết nối mạng hoặc báo Admin.",
        );
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Sau khi đăng xuất thành công, đẩy người dùng về trang login
      router.push("/login");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  };

  if (prizes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff5f6] text-[#ff85a1] font-bold text-xl">
        Đang tải vòng quay...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#fff5f6] flex flex-col items-center justify-center py-10">
      <div className="absolute top-4 w-full px-6 flex justify-between items-center z-50">
        <div className="flex flex-col md:flex-row gap-2">
          {/* HIỂN THỊ EMAIL */}
          <div className="bg-white px-4 py-2 rounded-full border-2 border-[#ffdae0] text-[#8b3d48] font-bold shadow-sm text-sm">
            Tài khoản:{" "}
            <span className="text-lg text-[#ff85a1]">{userEmail}</span>
          </div>

          <button
            onClick={handleLogout}
            className="bg-[#ff85a1] hover:bg-[#ff6b8d] text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            ĐĂNG XUẤT
          </button>
          <div className="bg-white px-4 py-2 rounded-full border-2 border-[#ffdae0] text-[#8b3d48] font-bold shadow-sm text-sm">
            Lượt quay:{" "}
            <span className="text-[#ff85a1] text-lg">
              {userData?.spins_left || 0}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowHistory(true)}
          className="px-6 py-2 bg-white text-[#ff85a1] font-bold rounded-full shadow-sm border-2 border-[#ffdae0] hover:bg-[#ffe4e1] transition-colors"
        >
          Lịch sử quà
        </button>
      </div>

      <h1 className="text-3xl font-black text-[#ff85a1] mb-8 uppercase tracking-wider text-center drop-shadow-sm">
        Vòng Quay May Mắn
      </h1>

      <LuckyWheel
        prizes={prizes}
        targetIndex={targetIndex}
        onFinished={handleSpinFinished}
        // THÊM DÒNG NÀY ĐỂ KHÓA NÚT SPIN KHI SỐ LƯỢT <= 0
        disabled={!userData || userData.spins_left <= 0}
      />

      {/* POPUP CHÚC MỪNG TRÚNG THƯỞNG LUXURY */}
      {wonPrize && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white w-[90%] max-w-sm rounded-[2rem] shadow-2xl p-8 text-center border-8 border-[#ffe4e1] transform animate-in zoom-in-75 duration-300">
            <div className="text-5xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-black text-[#ff85a1] mb-2 uppercase tracking-wide">
              Chúc mừng bạn!
            </h2>
            <p className="text-[#8b3d48] font-medium mb-4">
              Bạn đã nhận được phần thưởng:
            </p>
            <div className="bg-[#fff5f6] py-4 px-6 rounded-2xl border-2 border-dashed border-[#ff85a1] mb-6">
              <span className="text-xl font-black text-[#ff85a1] uppercase">
                {wonPrize}
              </span>
            </div>
            <button
              onClick={() => setWonPrize(null)}
              className="w-full py-3 bg-gradient-to-r from-[#ffb6c1] to-[#ff85a1] text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
            >
              Nhận Quà
            </button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-[90%] max-w-md rounded-3xl shadow-2xl overflow-hidden border-4 border-[#ffdae0] transform transition-all">
            <div className="bg-[#ff85a1] py-4 text-center relative">
              <h2 className="text-white font-black text-xl tracking-wider uppercase">
                Lịch sử trúng thưởng
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="absolute top-1/2 -translate-y-1/2 right-4 text-white hover:text-[#ffe4e1] font-bold text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {userData?.history && userData.history.length > 0 ? (
                <ul className="space-y-3">
                  {/* 4. THAY `item: any` BẰNG `item: HistoryItem` */}
                  {[...userData.history]
                    .reverse()
                    .map((item: HistoryItem, index: number) => (
                      <li
                        key={index}
                        className="flex flex-col p-3 bg-[#fff5f6] rounded-xl border border-[#ffe4e1]"
                      >
                        <span className="font-bold text-[#8b3d48] text-lg">
                          {item.prize}
                        </span>
                        <span className="text-xs text-[#ff85a1] font-medium mt-1">
                          {new Date(item.date).toLocaleDateString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="text-center py-10 text-[#ffb6c1]">
                  <p className="font-medium text-lg mb-2">
                    Bạn chưa có quà nào.
                  </p>
                  <p className="text-sm">Hãy thử vận may ngay nhé!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
