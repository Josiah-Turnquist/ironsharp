import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { BottomSheet } from "@/components/BottomSheet";
import { useThemeColor } from "@/components/useThemeColor";
import { useJourney } from "@/lib/queries";
import type { JourneyBook } from "@/lib/api";

/**
 * Your Bible Journey — every book of the Bible, and how much of each one you've
 * read this year.
 *
 * Progress is measured in VERSES, not chapters, which is what separates a
 * read-through (fills a book solid, earns the check) from a topical plan
 * (speckles it). Books you haven't opened stay dim with a dash rather than a
 * demoralizing 0% — the empty ones are the invitation, not a failing grade.
 */
export default function BibleJourney() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [openBook, setOpenBook] = useState<JourneyBook | null>(null);
  const [pickingYear, setPickingYear] = useState(false);

  const { data, isLoading, isError } = useJourney(year);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  // Genesis through Revelation — the server hands books back in canon order, so
  // splitting by testament keeps each half in reading order.
  const [oldTestament, newTestament] = useMemo(() => {
    const books = data?.books ?? [];
    return [
      books.filter((b) => b.testament === "OT"),
      books.filter((b) => b.testament === "NT"),
    ];
  }, [data]);

  const years = data?.availableYears ?? [year];

  return (
    <Screen edges={["top", "bottom"]}>
      <Header
        title="Your Bible Journey"
        subtitle={String(year)}
        rightAction={
          years.length > 1 ? (
            <Pressable
              onPress={() => setPickingYear(true)}
              accessibilityRole="button"
              accessibilityLabel={`Change year, currently ${year}`}
              className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 active:bg-muted/40"
            >
              <Text className="text-sm text-muted-foreground">{year}</Text>
              <ChevronDown size={14} color={muted} />
            </Pressable>
          ) : null
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : isError || !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted-foreground">
            Couldn&apos;t load your journey. Pull back and try again.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg gap-1 px-4 pb-8 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-2 flex-row gap-2">
            <Stat value={data.totals.books} label={data.totals.books === 1 ? "book" : "books"} />
            <Stat
              value={data.totals.chapters}
              label={data.totals.chapters === 1 ? "chapter" : "chapters"}
            />
            <Stat value={data.totals.days} label={data.totals.days === 1 ? "day read" : "days read"} />
          </View>

          {data.totals.books === 0 ? (
            <View className="mt-4 items-center rounded-xl border border-border bg-card p-8">
              <Text className="text-center text-sm text-muted-foreground">
                Nothing marked yet for {year}. Finish a day and the first book lights up.
              </Text>
            </View>
          ) : null}

          <SectionLabel>Old Testament</SectionLabel>
          {oldTestament.map((b) => (
            <BookRow key={b.book} book={b} onPress={() => setOpenBook(b)} />
          ))}

          <SectionLabel>New Testament</SectionLabel>
          {newTestament.map((b) => (
            <BookRow key={b.book} book={b} onPress={() => setOpenBook(b)} />
          ))}
        </ScrollView>
      )}

      <BottomSheet
        visible={!!openBook}
        onClose={() => setOpenBook(null)}
        contentStyle={{ padding: 24, maxHeight: "75%" }}
      >
        {openBook ? <BookDetail book={openBook} year={year} /> : null}
      </BottomSheet>

      <BottomSheet
        visible={pickingYear}
        onClose={() => setPickingYear(false)}
        contentStyle={{ padding: 24, maxHeight: "60%" }}
      >
        <Text className="mb-3 font-serif text-xl font-bold text-foreground">Which year?</Text>
        {years.map((y) => (
          <Pressable
            key={y}
            onPress={() => {
              setYear(y);
              setPickingYear(false);
            }}
            className="flex-row items-center justify-between border-b border-border py-3.5 active:opacity-70"
          >
            <Text className="text-base text-foreground">{y}</Text>
            {y === year ? <Check size={18} color={primary} /> : null}
          </Pressable>
        ))}
      </BottomSheet>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 rounded-xl bg-muted/50 p-3">
      <Text className="font-serif text-2xl font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mt-5 mb-1 text-xs uppercase tracking-wider text-muted-foreground">
      {children}
    </Text>
  );
}

/**
 * A rounded percentage, except that anything above zero never reads "0%" —
 * a verse of Matthew is real progress and shouldn't display as nothing.
 */
function percentLabel(read: number, total: number): string {
  if (total === 0 || read === 0) return "—";
  const pct = Math.round((read / total) * 100);
  return pct < 1 ? "<1%" : `${pct}%`;
}

function BookRow({ book, onPress }: { book: JourneyBook; onPress: () => void }) {
  const primary = useThemeColor("primary");
  const started = book.versesRead > 0;
  const fraction = book.versesTotal > 0 ? book.versesRead / book.versesTotal : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        book.complete
          ? `${book.book}, finished`
          : started
            ? `${book.book}, ${book.versesRead} of ${book.versesTotal} verses`
            : `${book.book}, not started`
      }
      className="flex-row items-center gap-3 py-2 active:opacity-60"
    >
      <Text
        numberOfLines={1}
        className={`w-28 text-base ${started ? "text-foreground" : "text-muted-foreground/60"}`}
      >
        {book.book}
      </Text>

      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        {started ? (
          <View
            style={{
              // A started book always shows a sliver, so "barely begun" still
              // reads as begun rather than as untouched.
              width: `${Math.max(2, Math.round(fraction * 100))}%`,
              backgroundColor: primary,
            }}
            className="h-full rounded-full"
          />
        ) : null}
      </View>

      <View className="w-10 items-end">
        {book.complete ? (
          <Check size={17} color={primary} />
        ) : (
          <Text
            className={`text-xs ${started ? "text-muted-foreground" : "text-muted-foreground/50"}`}
          >
            {percentLabel(book.versesRead, book.versesTotal)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function BookDetail({ book, year }: { book: JourneyBook; year: number }) {
  const primary = useThemeColor("primary");

  return (
    <View>
      <View className="flex-row items-center gap-2">
        <Text className="font-serif text-2xl font-bold text-foreground">{book.book}</Text>
        {book.complete ? <Check size={20} color={primary} /> : null}
      </View>

      <Text className="mt-1 text-sm text-muted-foreground">
        {book.versesRead === 0
          ? `${book.versesTotal} verses, still ahead of you.`
          : book.complete
            ? `All ${book.versesTotal} verses, in ${year}.`
            : `${book.versesRead} of ${book.versesTotal} verses in ${year} — ${percentLabel(
                book.versesRead,
                book.versesTotal
              )}.`}
      </Text>

      {book.entries.length > 0 ? (
        <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
          {book.entries.map((e, i) => (
            <View key={`${e.at}-${i}`} className="border-b border-border py-3">
              <Text className="text-base text-foreground">{e.ref}</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                {e.source} · {new Date(e.at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
