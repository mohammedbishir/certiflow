"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewTemplatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/templates/designer");
  }, [router]);

  return (
    <div className="designer-loading">
      <p>Opening certificate designer...</p>
    </div>
  );
}
