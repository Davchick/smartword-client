# Responsive Quick Reference

## Import (copy-paste)

```tsx
import { useDeviceSize, useResponsiveTypography, moderateScale, scale, verticalScale } from '../utils/responsive';
```

## Component Template (copy-paste)

```tsx
const MyComponent = () => {
  const { isSmall, isMedium, isLarge, spacing, radii } = useDeviceSize();
  const typography = useResponsiveTypography();

  return (
    <View style={{ padding: spacing.md }}>
      <Text style={{ fontSize: typography.title }}>Title</Text>
      <Text style={{ fontSize: typography.body }}>Body text</Text>
      <View style={{ 
        width: moderateScale(40), 
        height: moderateScale(40),
        borderRadius: radii.md 
      }} />
    </View>
  );
};
```

## Screen Styles Template (copy-paste)

```tsx
const useMyScreenStyles = () => {
  const { isSmall, isMedium, isLarge, spacing, typography, radii } = useDeviceSize();
  
  return {
    ...StyleSheet.create({
      container: { flex: 1, padding: spacing.lg },
      card: { padding: spacing.md, borderRadius: radii.md },
      button: { 
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: radii.md,
      },
    }),
    buttonText: {
      fontSize: typography.body,
      fontWeight: 'bold',
    },
    spacing, // access if needed
  };
};

// Usage
const MyScreen = () => {
  const styles = useMyScreenStyles();
  return <View style={styles.container} />;
};
```

## Scaling Functions Cheat Sheet

| Function | Use For | Example |
|----------|---------|---------|
| `moderateScale(n)` | Icons, buttons, avatars, radius | `moderateScale(20)` → 18-22px |
| `scale(n)` | Width, horizontal spacing | `scale(100)` |
| `verticalScale(n)` | Height, vertical spacing | `verticalScale(200)` |
| `clampScale(n, min, max)` | Limit values | `clampScale(size, 12, 40)` |

## Device Sizes

| Category | Width | Devices |
|----------|-------|---------|
| **Small** | < 375px | iPhone SE, Galaxy A10 |
| **Medium** | 375-413px | iPhone 13/14/15, Pixel |
| **Large** | >= 414px | iPhone Pro Max, tablets |

## Adaptive Values

```tsx
const { spacing, typography, radii } = useDeviceSize();

// Spacing (adapts ±15%)
spacing.xs   // 4px → 3-5px
spacing.sm   // 8px → 7-9px
spacing.md   // 16px → 14-18px
spacing.lg   // 24px → 20-28px
spacing.xl   // 32px → 28-36px

// Typography (adapts ±10%)
typography.title    // 28px → 22-36px
typography.subtitle // 18px → 15-22px
typography.body     // 16px → 13-18px
typography.small    // 13px → 11-15px
typography.xs       // 11px → 9-13px

// Radius (adapts ±10%)
radii.sm   // 8px → 7-9px
radii.md   // 14px → 12-15px
radii.lg   // 24px → 22-26px
```

## Common Replacements

| Before | After |
|--------|-------|
| `width: 40` | `width: moderateScale(40)` |
| `fontSize: 16` | `fontSize: typography.body` |
| `padding: 16` | `padding: spacing.md` |
| `borderRadius: 12` | `borderRadius: radii.md` |
| `height: 60` | `height: moderateScale(60)` |
| `icon size={20}` | `icon size={moderateScale(20)}` |

## Quick Patterns

### Conditional for small devices
```tsx
const { isSmall } = useDeviceSize();

{isSmall ? <CompactView /> : <StandardView />}
```

### Adaptive icon
```tsx
<Icon size={isSmall ? moderateScale(18) : moderateScale(24)} />
```

### Adaptive grid columns
```tsx
const numColumns = useGridColumns(150, 12);
<FlatList numColumns={numColumns} />
```

### Adaptive line height
```tsx
<Text style={{ 
  fontSize: typography.body, 
  lineHeight: typography.bodyLineHeight 
}} />
```

---
Full docs: `RESPONSIVE_DESIGN.md`
