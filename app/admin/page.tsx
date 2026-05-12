"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../lib/firebase"; // Nhớ kiểm tra lại đường dẫn này cho khớp dự án của bạn
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  arrayRemove,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Thêm các import này từ firebase/app và firebase/auth
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
// Import firebaseConfig từ file config của bạn (để khởi tạo app phụ)
import { firebaseConfig } from "../../lib/firebase";

// Định nghĩa thêm cấu trúc cho phần Lịch sử
interface HistoryItem {
  prize: string;
  date: string;
}

// 1. Định nghĩa cấu trúc dữ liệu User (Đã thêm history)
interface UserData {
  id: string;
  email: string;
  spins_left: number;
  next_prize_index: number;
  role: string;
  history?: HistoryItem[]; // Thêm dòng này
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prizeList, setPrizeList] = useState<string[]>([]);
  const router = useRouter();
  // State cho việc thêm khách hàng mới
  const [newEmail, setNewEmail] = useState("");
  const [newSpins, setNewSpins] = useState(0);
  const [newPassword, setNewPassword] = useState("");

  // 2. Lấy danh sách giải thưởng động từ Firebase (settings/wheel)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "wheel"), (snap) => {
      if (snap.exists()) {
        setPrizeList(snap.data().prizes || []);
      }
    });
    return () => unsub();
  }, []);

  // 3. Kiểm tra quyền Admin và lấy danh sách khách hàng
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        const userRef = doc(db, "users", user.email);
        getDoc(userRef)
          .then((userSnap) => {
            if (userSnap.exists() && userSnap.data().role === "admin") {
              setIsAdmin(true);

              const unsubscribeUsers = onSnapshot(
                collection(db, "users"),
                (snapshot) => {
                  const userList = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  })) as UserData[];

                  // Ẩn chính mình (admin) khỏi danh sách quản lý
                  const customersOnly = userList.filter(
                    (u) => u.role !== "admin",
                  );
                  setUsers(customersOnly);
                  setLoading(false);
                },
              );

              return () => unsubscribeUsers();
            } else {
              router.push("/wheel");
            }
          })
          .catch(() => setLoading(false));
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // --- CÁC HÀM XỬ LÝ ---

  // Lưu danh sách giải thưởng
  const savePrizes = async (newList: string[]) => {
    try {
      const wheelRef = doc(db, "settings", "wheel");
      await setDoc(wheelRef, { prizes: newList }, { merge: true });
      alert("Đã cập nhật danh sách giải thưởng thành công!");
    } catch (error) {
      console.error("Lỗi khi lưu:", error);
      alert("Lỗi bảo mật! Kiểm tra lại Firebase Rules.");
    }
  };

  // Cộng/trừ lượt quay
  const handleUpdateSpins = async (
    userId: string,
    currentSpins: number,
    amount: number,
  ) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      spins_left: Math.max(0, currentSpins + amount),
    });
  };

  // Thêm khách hàng mới (Tạo cả Auth & Database)
  const handleAddUser = async () => {
    const email = newEmail.trim().toLowerCase();
    const password = newPassword;

    if (!email || !password) {
      alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    try {
      // 1. Kiểm tra xem user đã tồn tại trong Database chưa
      const userRef = doc(db, "users", email);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        alert("Email này đã tồn tại trong hệ thống!");
        return;
      }

      // 2. TẠO TÀI KHOẢN AUTH (Dùng App phụ để Admin không bị logout)
      const secondaryApp = getApps().find((app) => app.name === "SecondaryApp")
        ? getApp("SecondaryApp")
        : initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      try {
        await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await signOut(secondaryAuth); // Đăng xuất app phụ ngay
      } catch (authError: any) {
        if (authError.code === "auth/email-already-in-use") {
          alert(
            "Email này đã được tạo tài khoản trước đó trên Firebase Authentication!",
          );
        } else {
          throw authError;
        }
      }

      // 3. TẠO DỮ LIỆU TRÊN FIRESTORE
      // Trong hàm handleAddUser tại app/admin/page.tsx
      await setDoc(userRef, {
        email: email,
        role: "user",
        spins_left: Number(newSpins) || 0, // Đảm bảo là kiểu số
        next_prize_index: -1, // Giá trị mặc định luôn là -1
        history: [], // Khởi tạo mảng rỗng
      });

      alert("Thành công! Tài khoản đã được tạo và cấp lượt quay.");
      setNewEmail("");
      setNewPassword("");
      setNewSpins(0);
    } catch (error: any) {
      console.error("Lỗi tổng thể:", error);
      alert("Lỗi: " + error.message);
    }
  };

  // Chỉ định giải thưởng trúng tiếp theo
  const handleSetPrize = async (userId: string, prizeIndex: number) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      next_prize_index: prizeIndex,
    });
  };
  // Hàm xóa một phần thưởng cụ thể trong lịch sử của user
  const handleDeleteHistoryItem = async (userId: string, item: HistoryItem) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa phần thưởng "${item.prize}" này không?`,
    );
    if (!confirmDelete) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        // arrayRemove sẽ xóa đúng object có nội dung y hệt trong mảng
        history: arrayRemove(item),
      });
    } catch (error) {
      console.error("Lỗi khi xóa lịch sử:", error);
      alert("Không thể xóa phần thưởng. Vui lòng kiểm tra lại quyền.");
    }
  };

  // log out

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Sau khi đăng xuất thành công, đẩy người dùng về trang login
      router.push("/login");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0F1A41] flex items-center justify-center text-yellow-500 font-bold animate-pulse uppercase tracking-widest">
        Đang xác thực quyền Admin...
      </div>
    );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0F1A41] p-4 md:p-10 text-white font-sans">
      <div className="max-w-6xl mx-auto">
        {/* HEADER ADMIN */}
        <div className="max-w-6xl mx-auto flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-500 flex items-center gap-2 uppercase">
            <span className="w-2 h-8 bg-yellow-500 rounded-full"></span>
            Admin Control Panel
          </h1>

          {/* NÚT ĐĂNG XUẤT STYLE DARK MODE */}
          <button
            onClick={handleLogout}
            className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 px-6 py-2 rounded-xl font-bold transition-all active:scale-95 text-sm"
          >
            ĐĂNG XUẤT ADMIN
          </button>
        </div>

        {/* PHẦN 1: QUẢN LÝ GIẢI THƯỞNG (DÀNH CHO VÒNG QUAY) */}
        <h1 className="text-2xl font-bold text-yellow-500 mb-6 flex items-center gap-2">
          <span className="w-2 h-8 bg-yellow-500 rounded-full"></span>
          QUẢN LÝ GIẢI THƯỞNG
        </h1>

        <div className="bg-[#16214d] p-6 rounded-3xl border border-yellow-600/20 max-w-2xl mb-12 shadow-2xl">
          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {prizeList.map((prize, index) => (
              <div key={index} className="flex gap-2 animate-fadeIn">
                <div className="flex items-center justify-center bg-[#0F1A41] w-10 rounded-lg text-yellow-500 font-bold border border-white/5">
                  {index}
                </div>
                <input
                  type="text"
                  value={prize}
                  onChange={(e) => {
                    const tmp = [...prizeList];
                    tmp[index] = e.target.value;
                    setPrizeList(tmp);
                  }}
                  className="flex-1 bg-[#0F1A41] border border-white/10 p-3 rounded-lg outline-none focus:border-yellow-500 transition-all"
                  placeholder="Nhập tên phần thưởng..."
                />
                <button
                  onClick={() => {
                    const newList = prizeList.filter((_, i) => i !== index);
                    setPrizeList(newList);
                  }}
                  className="bg-red-500/10 text-red-500 px-4 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPrizeList([...prizeList, ""])}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-xl font-bold transition-all"
            >
              + Thêm ô mới
            </button>
            <button
              onClick={() => savePrizes(prizeList)}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-[#0F1A41] px-6 py-3 rounded-xl font-black shadow-lg transition-all"
            >
              LƯU THAY ĐỔI
            </button>
          </div>
        </div>

        {/* ---> KHU VỰC THÊM KHÁCH HÀNG MỚI <--- */}
        <div className="bg-[#16214d] p-6 rounded-3xl border border-yellow-600/20 max-w-5xl mb-8 shadow-xl flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-yellow-500 text-xs font-bold uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-[#0F1A41] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-yellow-500"
              placeholder="email@gmail.com"
            />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-yellow-500 text-xs font-bold uppercase mb-2">
              Mật khẩu
            </label>
            <input
              type="text" // Để text cho Admin dễ nhìn mật khẩu vừa đặt
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#0F1A41] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-yellow-500"
              placeholder="Trên 6 ký tự"
            />
          </div>

          <div className="w-full md:w-28">
            <label className="block text-yellow-500 text-xs font-bold uppercase mb-2">
              Lượt quay
            </label>
            <input
              type="number"
              value={newSpins}
              onChange={(e) => setNewSpins(Number(e.target.value))}
              className="w-full bg-[#0F1A41] border border-white/10 p-3 rounded-xl text-yellow-500 font-bold text-center outline-none focus:border-yellow-500"
            />
          </div>

          <button
            onClick={handleAddUser}
            className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-500 text-[#0F1A41] px-6 py-3 rounded-xl font-black transition-all h-[50px]"
          >
            TẠO TÀI KHOẢN
          </button>
        </div>

        {/* PHẦN 2: QUẢN LÝ NGƯỜI DÙNG */}
        <h1 className="text-3xl font-black text-yellow-500 mb-8 uppercase tracking-tighter flex items-center gap-2">
          <span className="w-2 h-10 bg-yellow-500 rounded-full"></span>
          Admin Control Panel
        </h1>

        <div className="overflow-x-auto bg-[#16214d] rounded-3xl shadow-2xl border border-yellow-600/10">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#1e2a5a] text-yellow-500 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                <th className="p-6">Khách hàng</th>
                <th className="p-6 text-center">Lượt quay</th>
                <th className="p-6">Chỉ định trúng</th>
                <th className="p-6">Lịch sử quà</th> {/* Cột mới thêm */}
                <th className="p-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-6 font-medium text-white/80">
                    <div className="flex flex-col">
                      <span>{user.email}</span>
                      <span className="text-[10px] text-white/20 font-mono">
                        {user.id}
                      </span>
                    </div>
                  </td>

                  <td className="p-6 text-center">
                    <span className="text-3xl font-black text-yellow-500 tabular-nums drop-shadow-md">
                      {user.spins_left}
                    </span>
                  </td>

                  <td className="p-6">
                    <select
                      className="w-full bg-[#0F1A41] border border-yellow-600/30 p-3 rounded-xl text-sm text-yellow-500 focus:outline-none focus:border-yellow-500 cursor-pointer"
                      value={user.next_prize_index}
                      onChange={(e) =>
                        handleSetPrize(user.id, parseInt(e.target.value))
                      }
                    >
                      <option value="-1">🎲 Ngẫu nhiên (Random)</option>
                      {prizeList.map((name, index) => (
                        <option key={index} value={index}>
                          🎁 Ô số {index}: {name || "(Trống)"}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* HIỂN THỊ LỊCH SỬ TRÚNG THƯỞNG CỦA KHÁCH */}
                  {/* HIỂN THỊ LỊCH SỬ TRÚNG THƯỞNG CỦA KHÁCH */}
                  <td className="p-6">
                    {user.history && user.history.length > 0 ? (
                      <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar space-y-2 w-48">
                        {[...user.history].reverse().map((h, i) => (
                          <div
                            key={i}
                            className="text-xs border-b border-white/10 pb-2 mb-2 last:border-0 flex justify-between items-start group"
                          >
                            <div>
                              <span className="text-yellow-500 font-bold">
                                {h.prize}
                              </span>
                              <br />
                              <span className="text-white/40 text-[10px]">
                                {new Date(h.date).toLocaleDateString("vi-VN")}{" "}
                                {new Date(h.date).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            {/* NÚT XÓA: Chỉ hiện rõ khi di chuột vào vùng này */}
                            <button
                              onClick={() =>
                                handleDeleteHistoryItem(user.id, h)
                              }
                              className="text-white/20 hover:text-red-500 transition-colors ml-2 font-bold"
                              title="Xóa phần thưởng này"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-white/20 italic text-xs">
                        Chưa có quà
                      </span>
                    )}
                  </td>

                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          handleUpdateSpins(user.id, user.spins_left, 1)
                        }
                        className="bg-yellow-600 hover:bg-yellow-500 text-[#0F1A41] h-10 w-20 rounded-xl font-black text-xs uppercase shadow-md transition-all active:scale-95"
                      >
                        +1 Lượt
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateSpins(user.id, user.spins_left, -1)
                        }
                        className="bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 h-10 w-10 rounded-xl font-bold transition-all border border-white/5"
                      >
                        -1
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-white/20 italic"
                  >
                    Chưa có khách hàng nào trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-10 text-center text-[10px] text-white/20 uppercase tracking-[0.5em]">
          CityHouse Management System v2.0
        </p>
      </div>
    </div>
  );
}
