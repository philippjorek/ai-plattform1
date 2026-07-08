import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test")({
  component: Test,
});

function Test() {
  return (
    <div>
      <h1>TEST OK</h1>
    </div>
  );
}
