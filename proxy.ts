import { auth } from "@/lib/auth/server";

export const proxy = auth.middleware({
  loginUrl: "/auth/sign-in",
});

export default proxy;

export const config = {
  matcher: ["/orgs", "/orgs/:path*"],
};
