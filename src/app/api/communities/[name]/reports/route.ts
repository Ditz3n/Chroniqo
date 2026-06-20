// src/app/api/communities/[name]/reports/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const community = await prisma.community.findUnique({
      where: { name: decodedName },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    const globalUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const userRole = community.members[0]?.role;
    const isGlobalAdmin = globalUser?.role === "ADMIN";
    const hasAccess =
      isGlobalAdmin || ["OWNER", "ADMIN", "MODERATOR"].includes(userRole || "");

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch reports for Posts and Comments in this community
    const [postReports, commentReports, memberReports] = await Promise.all([
      prisma.report.findMany({
        // STRICT: Only posts, NOT users or comments
        where: {
          targetPostId: { not: null },
          targetCommentId: null,
          targetUserId: null,
          targetPost: { communityId: community.id },
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              avatarEmoji: true,
              avatarBgColor: true,
              emailVerified: true,
            },
          },
          targetPost: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  image: true,
                  avatarEmoji: true,
                  avatarBgColor: true,
                },
              },
              community: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.findMany({
        // STRICT: Only comments, NOT users
        where: {
          targetCommentId: { not: null },
          targetUserId: null,
          targetPostId: null,
          targetComment: { post: { communityId: community.id } },
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              avatarEmoji: true,
              avatarBgColor: true,
              emailVerified: true,
            },
          },
          targetComment: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  image: true,
                  avatarEmoji: true,
                  avatarBgColor: true,
                },
              },
              post: {
                select: {
                  id: true,
                  title: true,
                  community: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.findMany({
        // STRICT: Only User Reports directed AT THIS COMMUNITY (Contexts are allowed!)
        where: {
          targetUserId: { not: null },
          targetCommunityId: community.id,
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              avatarEmoji: true,
              avatarBgColor: true,
              emailVerified: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              avatarEmoji: true,
              avatarBgColor: true,
              emailVerified: true,
            },
          },
          targetPost: {
            select: {
              id: true,
              title: true,
              content: true,
              community: {
                select: { name: true },
              },
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  image: true,
                  emailVerified: true,
                },
              },
            },
          },
          targetComment: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  image: true,
                  emailVerified: true,
                },
              },
              post: {
                select: {
                  id: true,
                  title: true,
                  community: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json(
      { postReports, commentReports, memberReports },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Community Reports GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
