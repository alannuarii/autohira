interface RiskBadgeProps {
  category: string;
}

export default function RiskBadge(props: RiskBadgeProps) {
  const getBadgeConfig = () => {
    switch (props.category) {
      case "Rendah":
        return {
          class: "badge-risk-rendah",
          dotColor: "bg-emerald-400",
        };
      case "Moderate":
        return {
          class: "badge-risk-moderate",
          dotColor: "bg-amber-400",
        };
      case "Tinggi":
        return {
          class: "badge-risk-tinggi",
          dotColor: "bg-orange-400",
        };
      case "Sangat Tinggi":
        return {
          class: "badge-risk-sangat-tinggi",
          dotColor: "bg-rose-500",
        };
      case "Ekstrim":
        return {
          class: "badge-risk-ekstrim",
          dotColor: "bg-rose-300 animate-pulse",
        };
      default:
        return {
          class: "badge-risk-rendah",
          dotColor: "bg-emerald-400",
        };
    }
  };

  return (
    <span class={`badge-risk ${getBadgeConfig().class}`}>
      <span class={`w-1.5 h-1.5 rounded-full ${getBadgeConfig().dotColor}`} />
      <span>{props.category}</span>
    </span>
  );
}
