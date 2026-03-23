import { redirect } from "next/navigation";

export default function RootPage() {
  // 루트 접속 시 공식 브랜드 사이트로 리다이렉트
  redirect("https://tash.kr");
}
