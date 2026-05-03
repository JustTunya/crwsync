import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { WorkspaceRoleEnum } from "@prisma/client";
import { RequireWorkspaceRoles } from "src/workspace/decorators/ws-roles.decorator";
import { WorkspaceRolesGuard } from "src/workspace/guards/ws-roles.guard";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { BoardService } from "src/board/board.service";
import {
  CreateBoardDto,
  UpdateBoardDto,
  CreateColumnDto,
  UpdateColumnDto,
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  ReorderColumnsDto,
  ReorderModulesDto,
  UpdateModuleDto,
} from "src/board/dto/board.dto";

@Controller("workspaces/:workspaceId/boards")
@UseGuards(IsMemberGuard)
@SkipThrottle()
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  create(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: CreateBoardDto,
  ) {
    return this.boardService.createBoard(workspaceId, user.userId, dto);
  }

  @Get()
  findAll(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
  ) {
    return this.boardService.getBoards(workspaceId);
  }

  @Get("tasks/search")
  searchTasks(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Query("q") q: string,
  ) {
    return this.boardService.searchTasks(workspaceId, q || "");
  }

  @Get(":boardId")
  findOne(
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
  ) {
    return this.boardService.getBoard(boardId);
  }

  @Patch(":boardId")
  update(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardService.updateBoard(workspaceId, boardId, dto);
  }

  @Delete(":boardId")
  @UseGuards(WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  remove(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
  ) {
    return this.boardService.deleteBoard(workspaceId, boardId);
  }

  @Post(":boardId/columns")
  createColumn(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.boardService.createColumn(workspaceId, boardId, dto);
  }

  @Patch(":boardId/columns/:columnId")
  updateColumn(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @Param("columnId", new ParseUUIDPipe({ version: "4" })) columnId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.boardService.updateColumn(workspaceId, boardId, columnId, dto);
  }

  @Delete(":boardId/columns/:columnId")
  deleteColumn(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @Param("columnId", new ParseUUIDPipe({ version: "4" })) columnId: string,
  ) {
    return this.boardService.deleteColumn(workspaceId, boardId, columnId);
  }

  @Put(":boardId/columns/reorder")
  reorderColumns(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.boardService.reorderColumns(workspaceId, boardId, dto);
  }

  @Post(":boardId/tasks")
  createTask(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.boardService.createTask(workspaceId, boardId, dto, user.userId);
  }

  @Patch(":boardId/tasks/:taskId")
  updateTask(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.boardService.updateTask(workspaceId, boardId, taskId, dto);
  }

  @Delete(":boardId/tasks/:taskId")
  deleteTask(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
  ) {
    return this.boardService.deleteTask(workspaceId, boardId, taskId);
  }

  @Put(":boardId/tasks/:taskId/move")
  moveTask(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: MoveTaskDto,
  ) {
    return this.boardService.moveTask(
      workspaceId,
      boardId,
      taskId,
      dto,
      user.userId,
    );
  }
}

@Controller("workspaces/:workspaceId/modules")
@UseGuards(IsMemberGuard)
@SkipThrottle()
export class ModuleController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  findAll(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
  ) {
    return this.boardService.getWorkspaceModules(workspaceId, user.userId);
  }

  @Put("reorder")
  reorder(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Body() dto: ReorderModulesDto,
  ) {
    return this.boardService.reorderModules(workspaceId, dto);
  }

  @Patch(":moduleId")
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  update(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("moduleId", new ParseUUIDPipe({ version: "4" })) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.boardService.updateModule(workspaceId, moduleId, dto);
  }

  @Delete(":moduleId")
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  remove(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @Param("moduleId", new ParseUUIDPipe({ version: "4" })) moduleId: string,
  ) {
    return this.boardService.deleteModule(workspaceId, moduleId);
  }
}
