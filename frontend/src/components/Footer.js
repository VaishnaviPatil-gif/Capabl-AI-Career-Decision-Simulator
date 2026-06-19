import LogoMark from "./LogoMark";

export default function Footer() {

  return (

    <footer className="border-t border-gray-200 py-10 mt-24">

      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between gap-8">

        <div>

          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LogoMark className="w-6 h-6 text-[#1d1d1f]" />
            Capabl
          </h2>

          <p className="text-gray-500 mt-3 max-w-sm leading-relaxed">

            AI-powered career intelligence platform helping students discover their true potential.

          </p>

        </div>

        <div className="text-sm text-gray-500">

          © 2026 Capabl. All rights reserved.

        </div>

      </div>

    </footer>
  );
}