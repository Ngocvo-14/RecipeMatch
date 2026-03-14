import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, username } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (username) {
      if (username.length < 3 || username.length > 20) {
        return NextResponse.json({ error: 'Username must be 3–20 characters' }, { status: 400 });
      }
      if (/\s/.test(username)) {
        return NextResponse.json({ error: 'Username cannot contain spaces' }, { status: 400 });
      }
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    if (username) {
      const taken = await User.findOne({ username: username.trim() });
      if (taken) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      ...(username ? { username: username.trim() } : {}),
    });

    const token = signToken({ userId: user._id.toString(), email: user.email });

    const response = NextResponse.json({
      message: 'Account created successfully',
      user: { _id: user._id, email: user.email, username: user.username, createdAt: user.createdAt },
      token,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
