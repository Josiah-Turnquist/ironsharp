import { ActivityIndicator, Pressable, Text, View, type PressableProps } from "react-native";

type Variant = "primary" | "outline" | "dark" | "destructive";

type Props = PressableProps & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
};

const containerByVariant: Record<Variant, string> = {
  primary: "bg-primary border border-primary",
  outline: "bg-transparent border border-border",
  dark: "bg-black border border-black",
  destructive: "bg-destructive border border-destructive",
};

const textByVariant: Record<Variant, string> = {
  primary: "text-primary-foreground",
  outline: "text-foreground",
  dark: "text-white",
  destructive: "text-white",
};

export function Button({
  title,
  variant = "primary",
  loading = false,
  leftIcon,
  disabled,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const onDark = variant === "primary" || variant === "dark" || variant === "destructive";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`h-12 w-full flex-row items-center justify-center gap-2 rounded-xl px-4 ${containerByVariant[variant]} ${
        isDisabled ? "opacity-60" : "active:opacity-80"
      }`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={onDark ? "#fff" : undefined} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text className={`font-sans-semibold text-base ${textByVariant[variant]}`}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
