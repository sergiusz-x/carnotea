import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute right-4 top-4"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>CarNotea</CardTitle>
          <CardDescription>Your personal vehicle diary.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Get started</Button>
        </CardContent>
      </Card>
    </main>
  );
}
