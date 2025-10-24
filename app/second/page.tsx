export default function Second() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="text-center">
        <h1 className="text-5xl font-bold text-black dark:text-white mb-4">
          두 번째 페이지
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
          This is the second page
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity"
        >
          홈으로 돌아가기
        </a>
      </main>
    </div>
  );
}
