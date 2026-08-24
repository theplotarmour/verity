import { redirect } from "next/navigation";
import { resolveActor } from "@/server/platform/auth";
import { SignInForm } from "./SignInForm";
import { VerityLockup } from "@/components/brand/VerityMark";

export const dynamic = "force-dynamic";

/**
 * Authentication — the product's front door.
 *
 * COMPOSITION
 * Not a form floating in the middle of an empty viewport. The identity sits at
 * the optical centre — slightly above true centre, where the eye expects it —
 * the form sits directly beneath on the same axis, and the column is held to
 * 340px so the fields read as deliberate rather than stretched. The background
 * is the plain canvas: no gradient, no illustration, no hero panel. The mark and
 * the whitespace carry the character.
 *
 * The form is separated by a hairline rather than boxed in a card. Bible V4 §1.A
 * puts hierarchy in alignment and negative space; a card here would add a border
 * that carries no meaning and make the page read as a dialog floating on
 * nothing.
 *
 * COPY
 * None beyond the words needed to act: the identity, "Sign in", two labels, one
 * button. The previous version explained that "authentication is handled by the
 * platform identity realm" — which describes our architecture to someone who
 * only wants to start work, and quietly tells anyone who reaches this page,
 * signed in or not, how the system is built. Swapping it for "Welcome back"
 * would be the same mistake in a friendlier voice, so it is simply gone.
 *
 * Only the experience changed. The authentication contract, session handling,
 * membership resolution and redirect behaviour are untouched.
 */
export default async function SignInPage() {
  // Already signed in with a usable membership? Nothing to do here.
  const actor = await resolveActor();
  if (actor) redirect("/");

  return (
    <main
      id="main"
      className="grid min-h-dvh justify-items-center bg-canvas px-6"
    >
      {/* Optical centring: more space below than above, because a composition
          centred by arithmetic reads as sitting too low. */}
      <div className="flex w-full max-w-[340px] flex-col justify-center pb-[16vh] pt-[12vh]">
        <div className="flex flex-col items-center">
          {/* The board's hero is the LOCKUP — mark and wordmark side by side.
              Stacking them vertically is a composition the identity sheet does
              not contain. */}
          <VerityLockup size={34} className="text-text" />
          {/* The board's tagline in its own treatment: neutral for the first two
              words, accent on the third. */}
          <p className="m-0 mt-5 text-[10px] font-medium uppercase tracking-[0.24em] text-text-tertiary">
            Operate. Optimize. <span className="text-accent-ink">Outperform.</span>
          </p>
        </div>

        <div className="mt-11 border-t border-line pt-9">
          <h1 className="mb-6 text-center text-[15px] font-medium text-text">Sign in</h1>
          <SignInForm />
        </div>
      </div>
    </main>
  );
}
