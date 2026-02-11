import React from "react";

export default function MainPage() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
  };
  return (
    <div>
      <h1>로그인</h1>
      <p>내용을 작성하세요</p>
    </div>
  );
}
