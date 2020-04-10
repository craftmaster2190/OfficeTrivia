import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AskerComponent } from "./asker/asker.component";

const routes: Routes = [
  { path: "asker", component: AskerComponent },
  { path: "", redirectTo: "/asker", pathMatch: "full" },
  { path: "**", redirectTo: "/asker" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
