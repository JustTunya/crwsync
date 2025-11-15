export default function Background() {
  return (
    <div aria-hidden="true" className="fixed top-0 -z-10 size-full bg-base-100">
      <div aria-hidden="true" className="fixed top-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#e6e6e6_1px,transparent_1px),linear-gradient(to_bottom,#e6e6e6_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div aria-hidden="true" className="fixed top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
        <div 
          style={{clipPath: "polygon(74.1% 44.1%, 90% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"}}
          className="aspect-video w-288.75 bg-linear-to-tr from-[#f68c36] to-[#ff513c] opacity-30"
        />
      </div>
    </div>
  );
}